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

  return (
    <ul className="serving-people-grid">
      {orderedPeople.map((person) => (
        <li key={person.id} className="serving-people-grid__item">
          <ServingPersonCard person={person} />
        </li>
      ))}
    </ul>
  )
}

function ServingPraiseRow({ subgroups }) {
  return (
    <ul className="serving-praise-row">
      {subgroups.map((subgroup) => {
        const person = sortByOrder(subgroup.people)[0]
        if (!person) {
          return null
        }

        return (
          <li key={subgroup.id} className="serving-praise-row__item">
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

  return (
    <section
      className={`serving-people-group${isPraiseRow ? ' serving-people-group--praise' : ''}`}
      aria-labelledby={`serving-group-${group.id}`}
    >
      <header className="serving-people-group__header">
        {isPraiseRow ? (
          <h2
            className="serving-people-group__title serving-people-group__title--praise"
            id={`serving-group-${group.id}`}
          >
            {group.title}
          </h2>
        ) : (
          <>
            <span className="serving-people-group__rule" aria-hidden="true" />
            <h2 className="serving-people-group__title" id={`serving-group-${group.id}`}>
              {group.title}
            </h2>
          </>
        )}
      </header>

      {isPraiseRow ? (
        <ServingPraiseRow subgroups={group.subgroups} />
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
