import ServingPeopleList from '@/components/servingPeople/ServingPeopleList'
import { CLERGY_GROUPS } from '@/data/servingPeople'

function ServingPeopleClergy() {
  return (
    <div className="serving-people-page">
      <ServingPeopleList groups={CLERGY_GROUPS} />
    </div>
  )
}

export default ServingPeopleClergy
