import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SiteHeader from '@/components/layout/SiteHeader'
import Footer from '@/components/layout/Footer'
import CategoryLayout from '@/components/layout/CategoryLayout'
import ImageProtection from '@/components/common/ImageProtection'
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
  ChurchLife,
  FacilityVr,
} from '@/pages/PlaceholderPage'
import '@/App.css'

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <BrowserRouter basename={basename || undefined}>
      <ImageProtection />
      <div className="app">
        <SiteHeader />
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route element={<CategoryLayout />}>
              <Route path="/about" element={<About />} />
              <Route path="/about/history" element={<About />} />
              <Route path="/about/facility-vr" element={<FacilityVr />} />
              <Route path="/about/location" element={<Location />} />
              <Route path="/worship" element={<Worship />} />
              <Route path="/word-worship" element={<WordWorship />} />
              <Route path="/education" element={<Education />} />
              <Route path="/mission" element={<Mission />} />
              <Route path="/fellowship" element={<Fellowship />} />
              <Route path="/sunday-school" element={<SundaySchool />} />
              <Route path="/church-life" element={<ChurchLife />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
