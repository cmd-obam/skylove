import ServingPersonCard, {
  ServingPraiseCard,
} from '@/components/servingPeople/ServingPersonCard'
import { sortByOrder } from '@/data/servingPeople'
import './ServingPeople.css'

function ServingPeopleGrid({ people }) {
  const orderedPeople = sortByOrder(people)

  if (orderedPeople.length === 0) {
    return null
  }

  const isMulti = orderedPeople.length > 1

  return (
    <ul
      className={`serving-people-grid${isMulti ? ' serving-people-grid--multi' : ''}`}
    >
      {orderedPeople.map((person) => (
        <li key={person.id} className="serving-people-grid__item">
          <ServingPersonCard person={person} />
        </li>
      ))}
    </ul>
  )
}

function ServingPraiseRow({ subgroups, pairLayout = false }) {
  return (
    <ul
      className={`serving-people-grid serving-people-grid--multi${
        pairLayout ? ' serving-people-grid--pair' : ''
      }`}
    >
      {subgroups.map((subgroup) => {
        const person = sortByOrder(subgroup.people)[0]
        if (!person) {
          return null
        }

        if (pairLayout) {
          return (
            <li key={subgroup.id} className="serving-people-grid__item serving-people-pair-item">
              <header className="serving-people-group__header">
                <span className="serving-people-group__rule" aria-hidden="true" />
                <h2 className="serving-people-group__title">{subgroup.title}</h2>
              </header>
              <ServingPersonCard person={person} />
            </li>
          )
        }

        return (
          <li key={subgroup.id} className="serving-people-grid__item">
            <ServingPraiseCard teamTitle={subgroup.title} person={person} />
          </li>
        )
      })}
    </ul>
  )
}

function ServingPeopleGroup({ group }) {
  const hasSubgroups = Array.isArray(group.subgroups) && group.subgroups.length > 0
  const isPraiseRow = group.layout === 'praise-row' && hasSubgroups
  const showHeader = Boolean(group.title) && !group.hideHeader

  return (
    <section
      className="serving-people-group"
      aria-labelledby={showHeader ? `serving-group-${group.id}` : undefined}
      aria-label={!showHeader && isPraiseRow ? '담임목사와 사모' : undefined}
    >
      {showHeader ? (
        <header className="serving-people-group__header">
          <span className="serving-people-group__rule" aria-hidden="true" />
          <h2 className="serving-people-group__title" id={`serving-group-${group.id}`}>
            {group.title}
          </h2>
        </header>
      ) : null}

      {isPraiseRow ? (
        <ServingPraiseRow subgroups={group.subgroups} pairLayout={group.id === 'pastor-pair'} />
      ) : hasSubgroups ? (
        <div className="serving-people-group__subgroups">
          {group.subgroups.map((subgroup) => (
            <div key={subgroup.id} className="serving-people-subgroup">
              <h3 className="serving-people-subgroup__title">{subgroup.title}</h3>
              <ServingPeopleGrid people={subgroup.people} />
            </div>
          ))}
        </div>
      ) : (
        <ServingPeopleGrid people={group.people} />
      )}
    </section>
  )
}

export default ServingPeopleGroup
