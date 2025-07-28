"""Git diff parser for converting unified diff format to side-by-side structure."""

import logging
from typing import Dict, List, Any, Optional, Tuple
from unidiff import PatchSet, PatchedFile, Hunk
import re

logger = logging.getLogger(__name__)


class DiffParseError(Exception):
    """Exception raised when diff parsing fails."""
    pass


def parse_git_diff(diff_text: str) -> List[Dict[str, Any]]:
    """Parse git diff output into structured side-by-side format.
    
    Args:
        diff_text: Raw git diff output in unified format
        
    Returns:
        List of file dictionaries with structured diff data
        
    Raises:
        DiffParseError: If parsing fails
    """
    try:
        if not diff_text.strip():
            return []
            
        # Parse using unidiff library
        patch_set = PatchSet(diff_text)
        
        files = []
        for patched_file in patch_set:
            file_data = _parse_file(patched_file)
            files.append(file_data)
            
        return files
        
    except Exception as e:
        logger.error(f"Failed to parse diff: {e}")
        raise DiffParseError(f"Diff parsing failed: {e}")


def _parse_file(patched_file: PatchedFile) -> Dict[str, Any]:
    """Parse a single file's diff data.
    
    Args:
        patched_file: PatchedFile object from unidiff
        
    Returns:
        Dictionary containing file metadata and hunks
    """
    # Determine file status
    if patched_file.is_added_file:
        status = "added"
    elif patched_file.is_removed_file:
        status = "deleted"
    elif patched_file.is_modified_file:
        status = "modified"
    elif patched_file.source_file != patched_file.target_file:
        status = "renamed"
    else:
        status = "modified"
    
    # Calculate total additions and deletions
    total_additions = 0
    total_deletions = 0
    for hunk in patched_file:
        total_additions += hunk.added
        total_deletions += hunk.removed
    
    # Clean up file paths by removing a/ and b/ prefixes
    target_path = patched_file.target_file or patched_file.source_file
    source_path = patched_file.source_file
    
    # Remove a/ and b/ prefixes commonly found in git diffs
    if target_path and target_path.startswith(('a/', 'b/')):
        target_path = target_path[2:]
    if source_path and source_path.startswith(('a/', 'b/')):
        source_path = source_path[2:]
    
    file_data = {
        "path": target_path,
        "old_path": source_path,
        "status": status,
        "additions": total_additions,
        "deletions": total_deletions,
        "changes": total_additions + total_deletions,
        "hunks": []
    }
    
    # Parse each hunk
    for hunk in patched_file:
        hunk_data = _parse_hunk(hunk)
        file_data["hunks"].append(hunk_data)
    
    return file_data


def _parse_hunk(hunk: Hunk) -> Dict[str, Any]:
    """Parse a single hunk into side-by-side structure.
    
    Args:
        hunk: Hunk object from unidiff
        
    Returns:
        Dictionary containing hunk metadata and side-by-side lines
    """
    hunk_data = {
        "old_start": hunk.source_start,
        "old_count": hunk.source_length,
        "new_start": hunk.target_start,
        "new_count": hunk.target_length,
        "section_header": hunk.section_header or "",
        "lines": []
    }
    
    # Convert linear hunk into side-by-side structure
    old_line_num = hunk.source_start
    new_line_num = hunk.target_start
    
    for line in hunk:
        line_data = _parse_line(line, old_line_num, new_line_num)
        hunk_data["lines"].append(line_data)
        
        # Update line numbers based on line type
        if line.line_type == ' ':  # Context line
            old_line_num += 1
            new_line_num += 1
        elif line.line_type == '-':  # Deletion
            old_line_num += 1
        elif line.line_type == '+':  # Addition
            new_line_num += 1
    
    return hunk_data


def _parse_line(line, old_line_num: int, new_line_num: int) -> Dict[str, Any]:
    """Parse a single diff line.
    
    Args:
        line: Line object from unidiff
        old_line_num: Current old file line number
        new_line_num: Current new file line number
        
    Returns:
        Dictionary containing line data for side-by-side view
    """
    # Determine line type
    if line.line_type == ' ':
        line_type = "context"
        old_num = old_line_num
        new_num = new_line_num
    elif line.line_type == '-':
        line_type = "deletion"
        old_num = old_line_num
        new_num = None
    elif line.line_type == '+':
        line_type = "addition"
        old_num = None
        new_num = new_line_num
    else:
        line_type = "context"
        old_num = old_line_num
        new_num = new_line_num
    
    return {
        "type": line_type,
        "old_line_num": old_num,
        "new_line_num": new_num,
        "content": line.value.rstrip('\n\r')  # Remove trailing newlines
    }


def create_side_by_side_lines(hunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert hunks into side-by-side line pairs for rendering.
    
    This function takes the parsed hunks and creates a structure optimized
    for side-by-side rendering, handling cases where additions and deletions
    don't match up 1:1.
    
    Args:
        hunks: List of parsed hunk dictionaries
        
    Returns:
        List of line pair dictionaries for side-by-side rendering
    """
    side_by_side_lines = []
    
    for hunk in hunks:
        # Add hunk header if present
        if hunk.get("section_header"):
            side_by_side_lines.append({
                "type": "hunk_header",
                "content": hunk["section_header"],
                "old_start": hunk["old_start"],
                "new_start": hunk["new_start"]
            })
        
        # Group consecutive additions and deletions for better alignment
        i = 0
        while i < len(hunk["lines"]):
            line = hunk["lines"][i]
            
            if line["type"] == "context":
                # Context lines appear on both sides
                side_by_side_lines.append({
                    "type": "context",
                    "left": {
                        "line_num": line["old_line_num"],
                        "content": line["content"]
                    },
                    "right": {
                        "line_num": line["new_line_num"],
                        "content": line["content"]
                    }
                })
                i += 1
                
            elif line["type"] == "deletion":
                # Look ahead for corresponding additions
                deletions = []
                additions = []
                
                # Collect consecutive deletions
                while i < len(hunk["lines"]) and hunk["lines"][i]["type"] == "deletion":
                    deletions.append(hunk["lines"][i])
                    i += 1
                
                # Collect consecutive additions
                while i < len(hunk["lines"]) and hunk["lines"][i]["type"] == "addition":
                    additions.append(hunk["lines"][i])
                    i += 1
                
                # Create side-by-side pairs
                max_lines = max(len(deletions), len(additions))
                for j in range(max_lines):
                    left_line = deletions[j] if j < len(deletions) else None
                    right_line = additions[j] if j < len(additions) else None
                    
                    side_by_side_lines.append({
                        "type": "change",
                        "left": {
                            "line_num": left_line["old_line_num"] if left_line else None,
                            "content": left_line["content"] if left_line else "",
                            "type": "deletion" if left_line else "empty"
                        },
                        "right": {
                            "line_num": right_line["new_line_num"] if right_line else None,
                            "content": right_line["content"] if right_line else "",
                            "type": "addition" if right_line else "empty"
                        }
                    })
                    
            elif line["type"] == "addition":
                # Handle standalone addition (no preceding deletion)
                side_by_side_lines.append({
                    "type": "change",
                    "left": {
                        "line_num": None,
                        "content": "",
                        "type": "empty"
                    },
                    "right": {
                        "line_num": line["new_line_num"],
                        "content": line["content"],
                        "type": "addition"
                    }
                })
                i += 1
            else:
                i += 1
    
    return side_by_side_lines


def parse_git_diff_for_rendering(diff_text: str) -> List[Dict[str, Any]]:
    """Parse git diff output into side-by-side structure optimized for rendering.
    
    This is the main method to use for converting git diff output into the final
    structure needed for frontend rendering. Each file contains hunks, and each
    hunk contains side-by-side line pairs ready for display.
    
    Args:
        diff_text: Raw git diff output in unified format
        
    Returns:
        List of files with side-by-side structure:
        [
          {
            "path": "file.js",
            "old_path": "file.js", 
            "status": "modified",
            "additions": 5,
            "deletions": 2,
            "changes": 7,
            "hunks": [
              {
                "old_start": 10, "old_count": 5,
                "new_start": 10, "new_count": 6,
                "section_header": "function example()",
                "lines": [
                  {
                    "type": "context|change|hunk_header",
                    "left": {"line_num": 10, "content": "...", "type": "context"},
                    "right": {"line_num": 10, "content": "...", "type": "context"}
                  }
                ]
              }
            ]
          }
        ]
        
    Raises:
        DiffParseError: If parsing fails
    """
    try:
        # First parse into intermediate structure
        parsed_files = parse_git_diff(diff_text)
        
        # Convert each file to side-by-side structure
        rendered_files = []
        for file_data in parsed_files:
            # Convert hunks to side-by-side lines
            side_by_side_lines = create_side_by_side_lines(file_data["hunks"])
            
            # Group side-by-side lines back into hunks for rendering
            rendered_hunks = _group_lines_into_hunks(side_by_side_lines, file_data["hunks"])
            
            rendered_file = {
                "path": file_data["path"],
                "old_path": file_data["old_path"],
                "status": file_data["status"],
                "additions": file_data["additions"],
                "deletions": file_data["deletions"],
                "changes": file_data["changes"],
                "hunks": rendered_hunks
            }
            
            rendered_files.append(rendered_file)
        
        return rendered_files
        
    except Exception as e:
        logger.error(f"Failed to parse diff for rendering: {e}")
        raise DiffParseError(f"Diff parsing for rendering failed: {e}")


def _group_lines_into_hunks(side_by_side_lines: List[Dict[str, Any]], original_hunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Group side-by-side lines back into hunks for structured rendering.
    
    Args:
        side_by_side_lines: List of side-by-side line pairs
        original_hunks: Original hunk metadata for reference
        
    Returns:
        List of hunks with side-by-side lines grouped appropriately
    """
    if not side_by_side_lines:
        return []
    
    rendered_hunks = []
    current_hunk = None
    hunk_index = 0
    
    for line_pair in side_by_side_lines:
        # Start a new hunk when we encounter a hunk header
        if line_pair["type"] == "hunk_header":
            if current_hunk is not None:
                rendered_hunks.append(current_hunk)
            
            # Get original hunk metadata if available
            original_hunk = original_hunks[hunk_index] if hunk_index < len(original_hunks) else {}
            
            current_hunk = {
                "old_start": line_pair["old_start"],
                "old_count": original_hunk.get("old_count", 0),
                "new_start": line_pair["new_start"], 
                "new_count": original_hunk.get("new_count", 0),
                "section_header": line_pair["content"],
                "lines": []
            }
            hunk_index += 1
            
        else:
            # If we haven't started a hunk yet, create a default one
            if current_hunk is None:
                original_hunk = original_hunks[0] if original_hunks else {}
                current_hunk = {
                    "old_start": original_hunk.get("old_start", 1),
                    "old_count": original_hunk.get("old_count", 0),
                    "new_start": original_hunk.get("new_start", 1),
                    "new_count": original_hunk.get("new_count", 0), 
                    "section_header": "",
                    "lines": []
                }
            
            # Add the line pair to current hunk
            current_hunk["lines"].append(line_pair)
    
    # Don't forget the last hunk
    if current_hunk is not None:
        rendered_hunks.append(current_hunk)
    
    return rendered_hunks


def get_file_summary(files: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate summary statistics for a set of parsed diff files.
    
    Args:
        files: List of parsed file dictionaries
        
    Returns:
        Dictionary containing summary statistics
    """
    total_files = len(files)
    total_additions = sum(file_data["additions"] for file_data in files)
    total_deletions = sum(file_data["deletions"] for file_data in files)
    
    files_by_status = {}
    for file_data in files:
        status = file_data["status"]
        files_by_status[status] = files_by_status.get(status, 0) + 1
    
    return {
        "total_files": total_files,
        "total_additions": total_additions,
        "total_deletions": total_deletions,
        "total_changes": total_additions + total_deletions,
        "files_by_status": files_by_status
    }