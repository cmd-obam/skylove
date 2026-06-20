function Card({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`card ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}

export default Card
