import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SiteHeader from '@/components/layout/SiteHeader'
import Footer from '@/components/layout/Footer'
import Home from '@/pages/Home'
import About from '@/pages/About'
import Worship from '@/pages/Worship'
import Location from '@/pages/Location'
import {
  WordWorship,
  Education,
  Mission,
  Fellowship,
  SundaySchool,
  Youth,
} from '@/pages/PlaceholderPage'
import '@/App.css'

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <BrowserRouter basename={basename || undefined}>
      <div className="app">
        <SiteHeader />
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/about/history" element={<About />} />
            <Route path="/about/pastor" element={<About />} />
            <Route path="/about/servants" element={<About />} />
            <Route path="/about/location" element={<Location />} />
            <Route path="/word-worship" element={<WordWorship />} />
            <Route path="/education" element={<Education />} />
            <Route path="/mission" element={<Mission />} />
            <Route path="/fellowship" element={<Fellowship />} />
            <Route path="/sunday-school" element={<SundaySchool />} />
            <Route path="/youth" element={<Youth />} />
            <Route path="/worship" element={<Worship />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
