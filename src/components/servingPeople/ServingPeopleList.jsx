import ServingPeopleGroup from '@/components/servingPeople/ServingPeopleGroup'
import { sortByOrder } from '@/data/servingPeople'
import './ServingPeople.css'

/**
 * 섬기는 사람들 목록 렌더러
 * groups 데이터만 교체하면 교역자/사역자 및 향후 CMS 연동이 가능합니다.
 */
function ServingPeopleList({ groups }) {
  const orderedGroups = sortByOrder(groups)

  return (
    <div className="serving-people-list">
      {orderedGroups.map((group) => (
        <ServingPeopleGroup key={group.id} group={group} />
      ))}
    </div>
  )
}

export default ServingPeopleList
