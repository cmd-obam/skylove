import Hero from '@/components/sections/Hero'
import HomeWelcome from '@/components/sections/HomeWelcome'
import HomeWorship from '@/components/sections/HomeWorship'
import HomeStory from '@/components/sections/HomeStory'
import Gallery from '@/components/sections/Gallery'
import HomeLocation from '@/components/sections/HomeLocation'
import HomeEventPopup from '@/components/home/HomeEventPopup'

function Home() {
  return (
    <>
      <Hero />
      <HomeWelcome />
      <HomeWorship />
      <HomeStory />
      <Gallery />
      <HomeLocation />
      <HomeEventPopup />
    </>
  )
}

export default Home
