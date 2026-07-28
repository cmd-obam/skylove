import ServingPeopleList from '@/components/servingPeople/ServingPeopleList'
import { MINISTER_GROUPS } from '@/data/servingPeople'

function ServingPeopleMinisters() {
  return (
    <div className="serving-people-page">
      <ServingPeopleList groups={MINISTER_GROUPS} />
    </div>
  )
}

export default ServingPeopleMinisters
