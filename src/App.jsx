import { useState } from 'react'
import FirebaseTest from './components/FirebaseTest'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🎭 Mafia Game</h1>
        <p>A game of deception</p>
      </header>
      <main style={{ width: '100%', padding: '2rem' }}>
        <FirebaseTest />
      </main>
    </div>
  )
}

export default App

