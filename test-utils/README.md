# Test Utilities

This folder contains utilities for local testing and development. **Remove this folder before deploying to production.**

## Dummy Users

Create dummy users to test the game without needing multiple Google accounts.

### Usage

1. **Add the DummyUserPanel component to your app** (temporarily):

```jsx
// In src/App.jsx, add a test route:
import DummyUserPanel from './test-utils/DummyUserPanel';

// Add route:
<Route path="/test" element={<DummyUserPanel />} />
```

2. **Visit** `http://localhost:3000/test`

3. **Click "Create Dummy Users"** to add 6 dummy players to the game

4. **Click "Remove Dummy Users"** to clean them up

### Dummy Users Created

- **Alice** (alice@test.com) - Red
- **Bob** (bob@test.com) - Teal
- **Charlie** (charlie@test.com) - Blue
- **Diana** (diana@test.com) - Orange
- **Eve** (eve@test.com) - Green
- **Frank** (frank@test.com) - Yellow

The first user (Alice) will be set as the host automatically.

### Programmatic Usage

You can also use the functions directly:

```javascript
import { createDummyUsers, removeDummyUsers } from './test-utils/createDummyUsers';

// Create dummy users
await createDummyUsers();

// Remove dummy users
await removeDummyUsers();
```

## ⚠️ Important

- These are **development tools only**
- **Remove this folder** before production deployment
- Dummy users are added to the `current_game` document
- They will appear in the lobby like real players
- You can assign host to any dummy user via admin panel

## Cleanup

To remove all test utilities:

```bash
# Delete the test-utils folder
rm -rf test-utils
```

Or manually delete the `test-utils` folder from your project.

