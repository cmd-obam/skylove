import ServingPersonCard from '@/components/servingPeople/ServingPersonCard'
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

function ServingPeopleGroup({ group }) {
  const hasSubgroups = Array.isArray(group.subgroups) && group.subgroups.length > 0

  return (
    <section className="serving-people-group" aria-labelledby={`serving-group-${group.id}`}>
      <header className="serving-people-group__header">
        <span className="serving-people-group__rule" aria-hidden="true" />
        <h2 className="serving-people-group__title" id={`serving-group-${group.id}`}>
          {group.title}
        </h2>
      </header>

      {hasSubgroups ? (
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
