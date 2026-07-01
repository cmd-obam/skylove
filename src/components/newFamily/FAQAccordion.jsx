import { useState } from 'react'
import { FAQ_ITEMS } from '@/data/newFamilyGuide'
import { AccordionChevron, SectionHeading } from '@/components/newFamily/shared'

function FAQAccordion({ items = FAQ_ITEMS }) {
  const [openId, setOpenId] = useState(null)

  const toggleItem = (id) => {
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <section className="nf-section nf-faq nf-fade" aria-label="자주 묻는 질문">
      <SectionHeading
        title="자주 묻는 질문"
        description="처음 방문하시는 분들이 자주 묻는 질문입니다."
        align="left"
      />

      <ul className="nf-accordion">
        {items.map((item) => {
          const isOpen = openId === item.id

          return (
            <li key={item.id} className="nf-accordion__item">
              <button
                type="button"
                className="nf-accordion__trigger"
                aria-expanded={isOpen}
                onClick={() => toggleItem(item.id)}
              >
                <span>{item.question}</span>
                <AccordionChevron isOpen={isOpen} />
              </button>
              <div
                className={`nf-accordion__panel${isOpen ? ' nf-accordion__panel--open' : ''}`}
                aria-hidden={!isOpen}
              >
                <p className="nf-accordion__answer">{item.answer}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default FAQAccordion
