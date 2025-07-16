# Testing Guide for Topics and Panels

## Understanding the Relationship
- **Panels** are groups of experts who provide feedback
- **Topics** belong to panels - only experts in a panel can see and provide feedback on that panel's topics
- **Rounds** manage iterative feedback collection for each topic

## Steps to Test

1. **Create a Panel First**
   - Navigate to http://localhost:5180/panels
   - Click "Create Panel"
   - Enter a name (e.g., "Healthcare Strategy Panel")
   - Enter a description
   - Click "Create Panel"
   - Note the panel ID in the URL (e.g., `/panels/abc123`)

2. **Fix Topic Creation** 
   Currently, topics are created with a hardcoded `DEFAULT_PANEL_ID = 'default-panel'`. To fix:
   - Either create a panel with ID 'default-panel' in Firebase Console
   - Or update `/src/routes/topics/new/+page.svelte` to use a real panel ID

3. **Create a Topic**
   - Navigate to http://localhost:5180/topics/new
   - Use either AI extraction or manual entry
   - The topic will be created for the default panel

4. **Test the Rounds System**
   - Navigate to a topic detail page
   - As an admin, you can toggle between "Rounds View" and "Simple View"
   - Start a new round to begin collecting feedback
   - Experts can submit feedback for the active round
   - Complete the round to see consensus metrics

## Quick Fix for Testing
To quickly fix the panel association issue, update line 13 in `/src/routes/topics/new/+page.svelte`:
```javascript
// Replace this:
const DEFAULT_PANEL_ID = 'default-panel';

// With the ID of your created panel:
const DEFAULT_PANEL_ID = 'your-actual-panel-id';
```

## Current Issues Resolved
- ✅ Fixed missing `getExpertsByIds` export
- ✅ Fixed missing `getInvitationsByPanel` import
- ✅ Fixed missing `removePanelFromExpert` function
- ✅ Fixed topic status from 'open' to 'active'
- ✅ Fixed TypeScript type issues
- ⚠️ Topic-Panel association needs manual fix (see above)