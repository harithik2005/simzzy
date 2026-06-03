import { getFeaturedPlans } from 'simzzy-backend'
import PlansClient from './PlansClient'

export default async function Plans() {
  const plans = await getFeaturedPlans(3)
  return <PlansClient plans={plans} />
}
