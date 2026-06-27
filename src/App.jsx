import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import SiteHeader from '@/components/layout/SiteHeader'
import Footer from '@/components/layout/Footer'
import CategoryLayout from '@/components/layout/CategoryLayout'
import SubLayout from '@/components/layout/SubLayout'
import ImageProtection from '@/components/common/ImageProtection'
import Home from '@/pages/Home'
import About from '@/pages/About'
import Worship from '@/pages/Worship'
import Location from '@/pages/Location'
import Auth from '@/pages/Auth'
import Signup from '@/pages/Signup'
import MemberEdit from '@/pages/MemberEdit'
import Admin from '@/pages/Admin'
import AdminRoute from '@/components/auth/AdminRoute'
import ChurchNews from '@/pages/ChurchNews'
import ChurchNewsDetail from '@/pages/ChurchNewsDetail'
import EventPhotos from '@/pages/EventPhotos'
import EventPhotoDetail from '@/pages/EventPhotoDetail'
import NewFamilyGuide from '@/pages/NewFamilyGuide'
import {
  WorshipGuidePage,
  Education,
  Mission,
  Fellowship,
  FacilityVr,
  Facilities,
} from '@/pages/PlaceholderPage'
import '@/App.css'

function LegacyEventPhotoDetailRedirect() {
  const { postId } = useParams()
  return <Navigate to={`/church-news/album/${postId}`} replace />
}

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
            <Route path="/signup" element={<Signup />} />
            <Route path="/member/edit" element={<MemberEdit />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route path="/church-news/news" element={<Navigate to="/church-news" replace />} />
            <Route path="/church-life" element={<Navigate to="/church-news" replace />} />
            <Route path="/church-life/album" element={<Navigate to="/church-news/album" replace />} />
            <Route path="/church-life/service" element={<Navigate to="/church-news" replace />} />
            <Route path="/church-life/worship-praise" element={<Navigate to="/church-news/album" replace />} />
            <Route path="/church-news/event-photos" element={<Navigate to="/church-news/album" replace />} />
            <Route path="/church-news/event-photos/:postId" element={<LegacyEventPhotoDetailRedirect />} />
            <Route path="/sunday-school" element={<Navigate to="/church-news" replace />} />
            <Route path="/church-news/new-family" element={<Navigate to="/church-news" replace />} />
            <Route path="/notice" element={<Navigate to="/church-news" replace />} />
            <Route path="/word-worship" element={<Navigate to="/worship-guide/sunday-blessing" replace />} />
            <Route element={<CategoryLayout />}>
              <Route element={<SubLayout />}>
                <Route path="/about" element={<About />} />
                <Route path="/about/history" element={<About />} />
                <Route path="/about/facility-vr" element={<FacilityVr />} />
                <Route path="/about/facilities" element={<Facilities />} />
                <Route path="/about/location" element={<Location />} />
                <Route path="/worship" element={<Worship />} />
                <Route path="/worship-guide" element={<Navigate to="/worship-guide/sunday-blessing" replace />} />
                <Route path="/worship-guide/sunday-blessing" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/sunday-praise" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/wednesday" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/dawn-prayer" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/el-shaddai-choir" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/cell-meeting" element={<WorshipGuidePage />} />
                <Route path="/education" element={<Education />} />
                <Route path="/mission" element={<Mission />} />
                <Route path="/fellowship" element={<Fellowship />} />
                <Route path="/church-news" element={<ChurchNews />} />
                <Route path="/church-news/album" element={<EventPhotos />} />
                <Route path="/church-news/album/:postId" element={<EventPhotoDetail />} />
                <Route path="/new-family" element={<NewFamilyGuide />} />
                <Route path="/church-news/:postId" element={<ChurchNewsDetail />} />
              </Route>
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
