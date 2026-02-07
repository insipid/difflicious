# Expandable Context Feature

## Overview

The expandable context feature allows users to dynamically load additional lines of code around diff hunks without needing to reload the entire diff view. This provides better context for understanding changes while maintaining a clean, focused interface.

## User Interface

### Hunk Header Layout

Each diff hunk displays a blue header row with a four-column layout that matches the diff structure below it:

1. **Left Line Number Column** (thin): Contains expand buttons
2. **Left Content Column** (wide): Shows the function/section header text
3. **Right Line Number Column** (thin): Contains expand buttons (identical to left)
4. **Right Content Column** (wide): Currently empty space

### Expand Buttons

Two types of expand buttons are available:

- **Expand Up** (▲): Loads additional lines before the current hunk
- **Expand Down** (▼): Loads additional lines after the current hunk

#### Button Behavior

- **Both buttons present**: Each button takes half the column height with a border between them
- **Single button present**: The button fills the entire column height for better visibility and easier clicking
- **Button states**: Shows arrow icon when ready, "..." when loading
- **Hover effects**: Buttons darken slightly on hover for visual feedback

#### Button Placement

- Expand buttons appear in both the left and right thin columns (line number columns)
- This provides redundant access points for better usability
- Buttons only appear when context expansion is possible in that direction

## API Integration

### Context Expansion Endpoint

The feature uses a dedicated API endpoint for fetching additional context:

```
POST /api/expand-context
```

**Request Parameters:**
- `file_path`: Path to the file being expanded
- `hunk_index`: Index of the hunk within the file
- `direction`: Either "before" or "after"
- `line_count`: Number of lines to expand (typically 10)

**Response Format:**
```json
{
  "success": true,
  "lines": [
    {
      "line_num": 123,
      "content": "    def example_function():",
      "type": "context"
    }
  ],
  "can_expand_more": true
}
```

### Frontend State Management

The feature integrates with the existing Alpine.js state management:

#### Key Functions

- `canExpandContext(filePath, hunkIndex, direction)`: Determines if expansion is possible
- `expandContext(filePath, hunkIndex, direction, lineCount)`: Performs the expansion
- `isContextLoading(filePath, hunkIndex, direction)`: Tracks loading state

#### State Updates

When context is expanded:
1. Loading state is set for the specific button
2. API request is made to fetch additional lines
3. Returned lines are inserted into the hunk data structure
4. UI re-renders with new content
5. Loading state is cleared

## Technical Implementation

### Layout Structure

The hunk header uses CSS Grid with `grid-cols-2` to create the left/right split, with each side containing:
- A thin column (`w-12`) for expand buttons using flexbox layout
- A wide column (`flex-1`) for content display

### Responsive Design

- Buttons fill their container width and height appropriately
- Text in content columns uses `overflow-hidden whitespace-nowrap` for clean truncation
- Layout maintains alignment with diff rows below

### Styling

- **Container**: Blue background (`bg-blue-50`) with blue text (`text-blue-800`)
- **Buttons**: Slightly darker blue (`bg-blue-200`) that darkens on hover (`hover:bg-blue-300`)
- **Borders**: Subtle borders between columns and buttons for visual separation
- **Typography**: Monospace font to match diff content

## User Experience

### Visual Consistency

- Header layout perfectly aligns with diff content columns below
- Button positioning provides intuitive access points
- Consistent heights and spacing throughout the interface

### Interaction Patterns

- Click any expand button to load 10 additional lines in that direction
- Loading feedback prevents multiple simultaneous requests
- Seamless integration with existing scroll and navigation behavior

### Context Preservation

- Expanded content maintains syntax highlighting
- Line numbers continue sequentially
- Diff markers (±) are preserved for changed lines

## Benefits

1. **Improved Context**: Users can see more surrounding code without losing their place
2. **Performance**: Only loads additional content when needed
3. **Clean Interface**: Maintains focused view while providing expansion options
4. **Consistent UX**: Expansion controls are always in predictable locations
5. **Accessibility**: Large click targets and clear visual feedback

## Future Enhancements

Potential improvements to consider:
- Configurable expansion line counts
- Keyboard shortcuts for expansion
- Bulk expansion options
- Context expansion for entire files
- Integration with file outline/navigation 
