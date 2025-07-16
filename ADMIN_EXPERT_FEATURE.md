# Admin as Expert Feature

## Overview
Panel admins can now choose to join their panels as experts, allowing them to participate in discussions while maintaining their administrative capabilities.

## Features Implemented

### 1. Join as Expert
- **Button Location**: Panel detail page header (visible to admins who aren't experts)
- **Action**: Creates expert record and adds admin to panel's expertIds
- **Visual**: "Join as Expert" button with UserCheck icon

### 2. Leave Expert Role  
- **Button Location**: Panel detail page header (visible to admins who are experts)
- **Action**: Removes from expertIds and deletes expert record
- **Confirmation**: Prompts before leaving role
- **Note**: User remains an admin after leaving expert role

### 3. Dual Role Display
- **Panel List**: Shows both "Admin" and "Expert" badges when applicable
- **Panel Detail**: Shows role badges next to panel name
- **Visual Clarity**: Different badge colors (Admin=default, Expert=secondary)

## Technical Implementation

### Functions Used
- `createExpert()` - Creates expert record when admin joins
- `addExpertToPanel()` - Adds user ID to panel's expertIds array
- `removeExpertFromPanel()` - Removes user ID from expertIds
- `deleteExpert()` - Removes expert record when leaving role

### State Management
- `isAdmin` - Checks if user is in panel's adminIds
- `isExpert` - Checks if user is in panel's expertIds  
- `canJoinAsExpert` - True when admin but not expert

## Benefits
1. **Flexibility**: Admins choose their level of participation
2. **Role Separation**: Admin ≠ Expert by default
3. **Clear UI**: Visual badges show current roles
4. **Easy Toggle**: Join/leave expert role with one click

## Usage Flow
1. Create a panel (you're added as admin only)
2. Click "Join as Expert" to participate in discussions
3. Create topics and start rounds
4. Provide feedback as an expert
5. Optionally "Leave Expert Role" while remaining admin