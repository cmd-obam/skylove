import TopBar from '@/components/layout/TopBar'
import Header from '@/components/layout/Header'
import Navigation from '@/components/layout/Navigation'
import './SiteHeader.css'

function SiteHeader() {
  return (
    <div className="site-header">
      <TopBar />
      <Header />
      <Navigation />
    </div>
  )
}

export default SiteHeader
