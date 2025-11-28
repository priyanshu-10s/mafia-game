import { useState } from 'react';

function FirebaseTest() {
  const [user, setUser] = useState(null);
  const [testResult, setTestResult] = useState('');
  
  // Check if Firebase is configured
  const checkFirebaseConfig = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    return apiKey && apiKey !== 'demo-key' && apiKey !== '';
  };
  
  const isFirebaseConfigured = checkFirebaseConfig();

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured) {
      setTestResult('❌ Firebase not configured. Please add your Firebase config to .env file.');
      return;
    }
    
    try {
      const { signInWithPopup } = await import('firebase/auth');
      const { auth, googleProvider } = await import('../firebase/config');
      
      if (!auth || !googleProvider) {
        setTestResult('❌ Firebase services not initialized. Check your config.');
        return;
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setTestResult('✅ Authentication successful!');
    } catch (error) {
      setTestResult('❌ Auth error: ' + error.message);
    }
  };

  const testFirestore = async () => {
    if (!isFirebaseConfigured) {
      setTestResult('❌ Firebase not configured. Please add your Firebase config to .env file.');
      return;
    }
    
    try {
      const { doc, setDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      
      if (!db) {
        setTestResult('❌ Firestore not initialized. Check your config.');
        return;
      }
      
      // Write test data
      await setDoc(doc(db, 'test', 'connection'), {
        message: 'Hello Firebase!',
        timestamp: new Date()
      });
      
      // Read it back
      const docSnap = await getDoc(doc(db, 'test', 'connection'));
      if (docSnap.exists()) {
        setTestResult('✅ Firestore working! Data: ' + docSnap.data().message);
      }
    } catch (error) {
      setTestResult('❌ Firestore error: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Firebase Connection Test</h2>
      
      {!isFirebaseConfigured && (
        <div style={{ 
          padding: '1rem', 
          background: '#F59E0B', 
          borderRadius: '12px',
          marginBottom: '1rem',
          color: 'white'
        }}>
          ⚠️ Firebase not configured. Please create `.env` file with your Firebase config.
          <br />
          <small style={{ fontSize: '0.875rem' }}>See `.env.example` for template.</small>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexDirection: 'column' }}>
        <button 
          onClick={handleGoogleSignIn}
          disabled={!isFirebaseConfigured}
          style={{
            padding: '1rem',
            background: isFirebaseConfigured 
              ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' 
              : '#6B7280',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: isFirebaseConfigured ? 'pointer' : 'not-allowed',
            opacity: isFirebaseConfigured ? 1 : 0.6
          }}
        >
          Test Google Sign-In
        </button>
        
        <button 
          onClick={testFirestore}
          disabled={!isFirebaseConfigured}
          style={{
            padding: '1rem',
            background: isFirebaseConfigured ? '#374151' : '#6B7280',
            color: 'white',
            border: '2px solid #4B5563',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: isFirebaseConfigured ? 'pointer' : 'not-allowed',
            opacity: isFirebaseConfigured ? 1 : 0.6
          }}
        >
          Test Firestore
        </button>
      </div>
      
      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#374151', borderRadius: '12px' }}>
          <p>✅ Logged in as: <strong>{user.displayName}</strong></p>
          <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
            Email: {user.email}
          </p>
        </div>
      )}
      
      {testResult && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: testResult.includes('✅') ? '#10B981' : '#EF4444',
          borderRadius: '12px',
          color: 'white'
        }}>
          {testResult}
        </div>
      )}
    </div>
  );
}

export default FirebaseTest;
