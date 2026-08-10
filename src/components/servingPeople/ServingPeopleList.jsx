import ServingPeopleGroup from '@/components/servingPeople/ServingPeopleGroup'
import { sortByOrder } from '@/data/servingPeople'
import './ServingPeople.css'

/**
 * 섬기는 사람들 목록 렌더러
 * groups 데이터만 교체하면 직분자/사역자 및 향후 CMS 연동이 가능합니다.
 */
function ServingPeopleList({ groups }) {
  const orderedGroups = sortByOrder(groups)

  return (
    <div className="serving-people-list">
      {orderedGroups.map((group) => (
        <ServingPeopleGroup key={group.id} group={group} />
      ))}

      <footer className="serving-people-rights" aria-label="저작권 및 초상권 안내">
        <p className="serving-people-rights__mark">
          © 2026 하늘사랑교회 All Rights Reserved.
        </p>
        <p className="serving-people-rights__text">
          본 페이지에 게시된 사진 및 인물 정보의 저작권 및 초상권은 하늘사랑교회 및 해당 인물에게
          있습니다.
        </p>
        <p className="serving-people-rights__text">
          허가 없이 사진 및 정보를 복제·저장·배포·수정하거나 상업적으로 이용하는 것을 금합니다.
        </p>
      </footer>
    </div>
  )
}

export default ServingPeopleList
