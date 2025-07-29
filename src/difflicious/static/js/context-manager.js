/**
 * Context Expansion Manager
 * Handles expanding diff context lines and hunk merging
 */
function createContextManager() {
    let groupsRef = null;
    let saveStateCallback = null;
    
    return {
        // State
        contextExpansions: {}, // { filePath: { hunkIndex: { beforeExpanded: number, afterExpanded: number } } }
        contextLoading: {}, // { filePath: { hunkIndex: { before: bool, after: bool } } }

        // Setup methods for dependency injection
        _setGroupsReference(groups) {
            groupsRef = groups;
        },
        
        _setSaveStateCallback(callback) {
            saveStateCallback = callback;
        },

        // Public API
        async expandContext(filePath, hunkIndex, direction, contextLines = 10) {
            // Find the target file to determine which hunk to actually expand
            let targetFile = null;
            for (const groupKey of Object.keys(groupsRef)) {
                const file = groupsRef[groupKey].files.find(f => f.path === filePath);
                if (file) {
                    targetFile = file;
                    break;
                }
            }

            if (!targetFile || !targetFile.hunks) {
                console.error('Target file not found');
                return;
            }

            let targetHunkIndex, targetDirection;

            if (direction === 'before') {
                // "Expand up" - expand the "before" context of the CURRENT hunk
                targetHunkIndex = hunkIndex;
                targetDirection = 'before';
            } else { // direction === 'after'
                // "Expand down" - expand the "after" context of the PREVIOUS hunk
                targetHunkIndex = hunkIndex - 1;
                targetDirection = 'after';
            }

            // Validate target hunk exists
            if (!targetFile.hunks[targetHunkIndex]) {
                console.error('Target hunk not found');
                return;
            }

            // Initialize context state for target hunk
            if (!this.contextExpansions[filePath]) {
                this.contextExpansions[filePath] = {};
            }
            if (!this.contextExpansions[filePath][targetHunkIndex]) {
                this.contextExpansions[filePath][targetHunkIndex] = { beforeExpanded: 0, afterExpanded: 0 };
            }
            if (!this.contextLoading[filePath]) {
                this.contextLoading[filePath] = {};
            }
            if (!this.contextLoading[filePath][targetHunkIndex]) {
                this.contextLoading[filePath][targetHunkIndex] = { before: false, after: false };
            }

            // Set loading state for target hunk
            this.contextLoading[filePath][targetHunkIndex][targetDirection] = true;

            try {
                const targetHunk = targetFile.hunks[targetHunkIndex];
                let startLine, endLine;

                if (targetDirection === 'before') {
                    // Get lines before the target hunk
                    endLine = targetHunk.new_start - 1;
                    startLine = Math.max(1, endLine - contextLines + 1);
                } else { // targetDirection === 'after'
                    // Get lines after the target hunk
                    startLine = targetHunk.new_start + targetHunk.new_count;
                    endLine = startLine + contextLines - 1;
                }

                const response = await this._fetchFileLines(filePath, startLine, endLine);
                if (response && response.status === 'ok' && response.lines) {
                    this._insertContextLines(filePath, targetHunkIndex, targetDirection, response.lines, startLine);
                    this.contextExpansions[filePath][targetHunkIndex][targetDirection + 'Expanded'] += response.lines.length;
                    // Save state after successful expansion
                    if (saveStateCallback) {
                        saveStateCallback();
                    }
                }
            } catch (error) {
                console.error('Failed to expand context:', error);
            } finally {
                // Clear loading state for target hunk
                this.contextLoading[filePath][targetHunkIndex][targetDirection] = false;
            }
        },

        canExpandContext(filePath, hunkIndex, direction) {
            // Find the file to get all hunks
            let targetFile = null;
            for (const groupKey of Object.keys(groupsRef)) {
                const file = groupsRef[groupKey].files.find(f => f.path === filePath);
                if (file) {
                    targetFile = file;
                    break;
                }
            }

            if (!targetFile || !targetFile.hunks || !targetFile.hunks[hunkIndex]) {
                return false;
            }

            const hunks = targetFile.hunks;

            if (direction === 'before') {
                // "Expand up" button visibility:
                if (hunkIndex === 0) {
                    // First hunk: show if it doesn't start at line 1
                    return hunks[0].old_start > 1;
                } else {
                    // All other hunks: always show (expands before context of current hunk)
                    return true;
                }

            } else if (direction === 'after') {
                // "Expand down" button visibility:
                if (hunkIndex === 0) {
                    // First hunk: never show "Expand down"
                    return false;
                } else {
                    // All other hunks: always show (expands after context of previous hunk)
                    return true;
                }
            }

            return false;
        },

        isContextLoading(filePath, hunkIndex, direction) {
            // Return false if loading state is not set up yet (undefined means not loading)
            return !!(this.contextLoading[filePath] &&
                this.contextLoading[filePath][hunkIndex] &&
                this.contextLoading[filePath][hunkIndex][direction]);
        },

        // Private methods
        async _fetchFileLines(filePath, startLine, endLine) {
            const params = new URLSearchParams();
            params.set('file_path', filePath);
            params.set('start_line', startLine.toString());
            params.set('end_line', endLine.toString());

            const url = `/api/file/lines?${params.toString()}`;
            const response = await fetch(url);
            return await response.json();
        },

        _insertContextLines(filePath, hunkIndex, direction, lines, startLineNum) {
            // Find the target file and hunk
            let targetFile = null;
            for (const groupKey of Object.keys(groupsRef)) {
                const file = groupsRef[groupKey].files.find(f => f.path === filePath);
                if (file) {
                    targetFile = file;
                    break;
                }
            }

            if (!targetFile || !targetFile.hunks || !targetFile.hunks[hunkIndex]) {
                console.warn('Target file or hunk not found for context insertion');
                return;
            }

            const currentHunk = targetFile.hunks[hunkIndex];

            // Convert the raw lines into diff line format
            let newDiffLines;

            if (direction === 'after') {
                // Special case: expanding down (extending previous hunk's after context)
                // Both sides continue sequentially from where the hunk ended
                const leftStartLineNum = currentHunk.old_start + currentHunk.old_count;
                const rightStartLineNum = currentHunk.new_start + currentHunk.new_count;

                newDiffLines = lines.map((content, index) => {
                    return {
                        type: 'context',
                        left: {
                            content: content,
                            line_num: leftStartLineNum + index
                        },
                        right: {
                            content: content,
                            line_num: rightStartLineNum + index
                        }
                    };
                });
            } else {
                // Expanding before: calculate separate line numbers for left and right sides
                const leftStartLineNum = currentHunk.old_start - lines.length;
                const rightStartLineNum = currentHunk.new_start - lines.length;

                newDiffLines = lines.map((content, index) => {
                    return {
                        type: 'context',
                        left: {
                            content: content,
                            line_num: leftStartLineNum + index
                        },
                        right: {
                            content: content,
                            line_num: rightStartLineNum + index
                        }
                    };
                });
            }

            if (direction === 'before') {
                // Insert at the beginning of the hunk
                currentHunk.lines = [...newDiffLines, ...currentHunk.lines];
                // Update hunk start positions
                currentHunk.old_start = Math.max(1, currentHunk.old_start - lines.length);
                currentHunk.new_start = Math.max(1, currentHunk.new_start - lines.length);
            } else { // direction === 'after'
                // Insert at the end of the hunk
                currentHunk.lines = [...currentHunk.lines, ...newDiffLines];
            }

            // Update hunk counts
            currentHunk.old_count += lines.length;
            currentHunk.new_count += lines.length;

            // Check if we need to merge hunks after expansion
            if (direction === 'after') {
                this._checkAndMergeHunks(targetFile, hunkIndex);
            } else if (direction === 'before') {
                // When expanding up, check if we can merge with the previous hunk
                this._checkAndMergeHunksReverse(targetFile, hunkIndex);
            }
        },

        _checkAndMergeHunks(targetFile, currentHunkIndex) {
            const nextHunkIndex = currentHunkIndex + 1;

            // Check if there's a next hunk to potentially merge with
            if (nextHunkIndex >= targetFile.hunks.length) {
                return;
            }

            const currentHunk = targetFile.hunks[currentHunkIndex];
            const nextHunk = targetFile.hunks[nextHunkIndex];

            console.log('🟡 Current hunk:', currentHunk);
            console.log('🟡 Next hunk:', nextHunk);

            // Calculate where current hunk ends and next hunk starts
            const currentOldEnd = currentHunk.old_start + currentHunk.old_count - 1; // Last line of current hunk
            const currentNewEnd = currentHunk.new_start + currentHunk.new_count - 1; // Last line of current hunk

            // Check if hunks are now adjacent or overlapping
            const oldGap = nextHunk.old_start - currentOldEnd - 1; // Gap between last line of current and first line of next
            const newGap = nextHunk.new_start - currentNewEnd - 1;

            console.log('🟡 Old gap, new gap:', oldGap, newGap);

            // Merge if hunks are adjacent or overlapping (gap <= 1, meaning at most 1 line between them)
            if (oldGap <= 1 && newGap <= 1) {
                // If there's a gap of 1 line, add context lines to bridge it
                if (oldGap === 1 && newGap === 1) {
                    // Add the single bridging line as context
                    const bridgeLine = {
                        type: 'context',
                        left: {
                            content: '', // Empty placeholder for the bridging line
                            line_num: currentOldEnd + 1
                        },
                        right: {
                            content: '',
                            line_num: currentNewEnd + 1
                        }
                    };
                    currentHunk.lines.push(bridgeLine);
                    currentHunk.old_count += 1;
                    currentHunk.new_count += 1;
                }

                // Merge the hunks with deduplication
                // Find overlapping lines by comparing line numbers
                const currentLastLeftLine = currentHunk.lines[currentHunk.lines.length - 1]?.left?.line_num || 0;
                const currentLastRightLine = currentHunk.lines[currentHunk.lines.length - 1]?.right?.line_num || 0;

                // Filter out duplicate lines
                const uniqueNextLines = nextHunk.lines.filter(line => {
                    const leftLineNum = line.left?.line_num || 0;
                    const rightLineNum = line.right?.line_num || 0;
                    return leftLineNum > currentLastLeftLine || rightLineNum > currentLastRightLine;
                });

                currentHunk.lines = [...currentHunk.lines, ...uniqueNextLines];
                currentHunk.old_count = nextHunk.old_start + nextHunk.old_count - currentHunk.old_start;
                currentHunk.new_count = nextHunk.new_start + nextHunk.new_count - currentHunk.new_start;

                // Update section header to combine both if they exist
                if (currentHunk.section_header && nextHunk.section_header) {
                    currentHunk.section_header = `${currentHunk.section_header} / ${nextHunk.section_header}`;
                } else if (nextHunk.section_header) {
                    currentHunk.section_header = nextHunk.section_header;
                }

                // Remove the next hunk from the array
                targetFile.hunks.splice(nextHunkIndex, 1);
            }
        },

        _checkAndMergeHunksReverse(targetFile, currentHunkIndex) {
            const previousHunkIndex = currentHunkIndex - 1;

            // Check if there's a previous hunk to potentially merge with
            if (previousHunkIndex < 0) {
                return;
            }

            const currentHunk = targetFile.hunks[currentHunkIndex];
            const previousHunk = targetFile.hunks[previousHunkIndex];

            // Calculate where previous hunk ends and current hunk starts
            const previousOldEnd = previousHunk.old_start + previousHunk.old_count - 1;
            const previousNewEnd = previousHunk.new_start + previousHunk.new_count - 1;

            // Check if hunks are now adjacent or overlapping
            const oldGap = currentHunk.old_start - previousOldEnd - 1;
            const newGap = currentHunk.new_start - previousNewEnd - 1;

            // Merge if hunks are adjacent or overlapping (gap <= 1, meaning at most 1 line between them)
            if (oldGap <= 1 && newGap <= 1) {
                // If there's a gap of 1 line, add context lines to bridge it
                if (oldGap === 1 && newGap === 1) {
                    // Add the single bridging line as context
                    const bridgeLine = {
                        type: 'context',
                        left: {
                            content: '', // Empty placeholder for the bridging line
                            line_num: previousOldEnd + 1
                        },
                        right: {
                            content: '',
                            line_num: previousNewEnd + 1
                        }
                    };
                    previousHunk.lines.push(bridgeLine);
                    previousHunk.old_count += 1;
                    previousHunk.new_count += 1;
                }

                // Find overlapping lines by comparing line numbers
                const previousLastLeftLine = previousHunk.lines[previousHunk.lines.length - 1]?.left?.line_num || 0;
                const previousLastRightLine = previousHunk.lines[previousHunk.lines.length - 1]?.right?.line_num || 0;

                // Filter out duplicate lines
                const uniqueCurrentLines = currentHunk.lines.filter(line => {
                    const leftLineNum = line.left?.line_num || 0;
                    const rightLineNum = line.right?.line_num || 0;
                    return leftLineNum > previousLastLeftLine || rightLineNum > previousLastRightLine;
                });

                previousHunk.lines = [...previousHunk.lines, ...uniqueCurrentLines];
                previousHunk.old_count = currentHunk.old_start + currentHunk.old_count - previousHunk.old_start;
                previousHunk.new_count = currentHunk.new_start + currentHunk.new_count - previousHunk.new_start;

                // Update section header to combine both if they exist
                if (previousHunk.section_header && currentHunk.section_header) {
                    previousHunk.section_header = `${previousHunk.section_header} / ${currentHunk.section_header}`;
                } else if (currentHunk.section_header) {
                    previousHunk.section_header = currentHunk.section_header;
                }

                // Remove the current hunk from the array
                targetFile.hunks.splice(currentHunkIndex, 1);
            }
        }
    };
}