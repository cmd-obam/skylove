import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SiteHeader from '@/components/layout/SiteHeader'
import Footer from '@/components/layout/Footer'
import CategoryLayout from '@/components/layout/CategoryLayout'
import ImageProtection from '@/components/common/ImageProtection'
import Home from '@/pages/Home'
import About from '@/pages/About'
import Worship from '@/pages/Worship'
import Location from '@/pages/Location'
import Auth from '@/pages/Auth'
import {
  WorshipGuidePage,
  Education,
  Mission,
  Fellowship,
  SundaySchool,
  ChurchAlbum,
  ChurchService,
  ChurchWorshipPraise,
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
            <Route path="/login" element={<Auth />} />
            <Route element={<CategoryLayout />}>
              <Route path="/about" element={<About />} />
              <Route path="/about/history" element={<About />} />
              <Route path="/about/facility-vr" element={<FacilityVr />} />
              <Route path="/about/location" element={<Location />} />
              <Route path="/worship" element={<Worship />} />
              <Route path="/worship-guide" element={<Navigate to="/worship-guide/sunday-blessing" replace />} />
              <Route path="/worship-guide/sunday-blessing" element={<WorshipGuidePage />} />
              <Route path="/worship-guide/sunday-praise" element={<WorshipGuidePage />} />
              <Route path="/worship-guide/wednesday" element={<WorshipGuidePage />} />
              <Route path="/worship-guide/dawn-prayer" element={<WorshipGuidePage />} />
              <Route path="/worship-guide/el-shaddai-choir" element={<WorshipGuidePage />} />
              <Route path="/worship-guide/cell-meeting" element={<WorshipGuidePage />} />
              <Route path="/word-worship" element={<Navigate to="/worship-guide/sunday-blessing" replace />} />
              <Route path="/education" element={<Education />} />
              <Route path="/mission" element={<Mission />} />
              <Route path="/fellowship" element={<Fellowship />} />
              <Route path="/sunday-school" element={<SundaySchool />} />
              <Route path="/church-life" element={<Navigate to="/church-life/album" replace />} />
              <Route path="/church-life/album" element={<ChurchAlbum />} />
              <Route path="/church-life/service" element={<ChurchService />} />
              <Route path="/church-life/worship-praise" element={<ChurchWorshipPraise />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
