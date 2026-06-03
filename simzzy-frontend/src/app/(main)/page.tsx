import Hero from '@/components/sections/Hero'
import Destinations from '@/components/sections/Destinations'
import HowItWorks from '@/components/sections/HowItWorks'
import Features from '@/components/sections/Features'
import Plans from '@/components/sections/Plans'
import DeviceCheck from '@/components/sections/DeviceCheck'
import Reviews from '@/components/sections/Reviews'
import FAQ from '@/components/sections/FAQ'
import CTA from '@/components/sections/CTA'

// `Plans` reads featured plans from the catalog DB, so the page renders at
// request time rather than being prerendered at build (avoids needing DB
// reachability during `next build`, and keeps featured plans always fresh).
export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <>
      <Hero />
      <Destinations />
      <HowItWorks />
      <Features />
      <Plans />
      <DeviceCheck />
      <Reviews />
      <FAQ />
      <CTA />
    </>
  )
}
