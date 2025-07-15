# Firebase Setup Instructions

## Deploying Firestore Security Rules

To fix the "Missing or insufficient permissions" error, you need to deploy the Firestore security rules to your Firebase project.

### Prerequisites
1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Make sure you're logged in to Firebase:
   ```bash
   firebase login
   ```

### Deploy Security Rules

1. Initialize Firebase in your project directory:
   ```bash
   firebase init
   ```
   - Select "Firestore" when prompted for features
   - Use the existing `delphi-webapp` project
   - Accept the default files (firestore.rules and firestore.indexes.json)

2. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

3. (Optional) Deploy the indexes for better query performance:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Understanding the Security Rules

The `firestore.rules` file implements the following security model:

1. **Items Collection**:
   - **Read**: Users can read items where they are listed in `adminIds` or `expertIds`
   - **Create**: Authenticated users can create items, but must include themselves in `adminIds`
   - **Update/Delete**: Only users listed in `adminIds` can update or delete items

2. **Rounds Collection**:
   - **Read**: All authenticated users can read rounds
   - **Create/Update**: Only item admins can create or update rounds
   - **Delete**: Rounds cannot be deleted (data integrity)

3. **Responses Collection**:
   - **Create**: Experts can submit their own responses
   - **Read**: Users can only read their own responses
   - **Update/Delete**: Responses are immutable once created

4. **Aggregations Collection**:
   - **Read**: All authenticated users can read aggregations
   - **Write**: Only backend services (Cloud Functions) should write aggregations

### Testing Locally with Emulators

To test the rules locally before deploying:

1. Start the Firebase emulators:
   ```bash
   firebase emulators:start
   ```

2. The emulator UI will be available at http://localhost:4000

3. Update your app to use the emulators by adding this to your Firebase config:
   ```javascript
   if (process.env.NODE_ENV === 'development') {
     connectFirestoreEmulator(db, 'localhost', 8080);
     connectAuthEmulator(auth, 'http://localhost:9099');
   }
   ```

### Troubleshooting

If you still get permission errors after deploying:
1. Check that you're authenticated (check browser console for auth state)
2. Verify the rules were deployed successfully in Firebase Console
3. Make sure the user's UID is included in the `adminIds` array when creating items
4. Check the Firebase Console logs for detailed error messages