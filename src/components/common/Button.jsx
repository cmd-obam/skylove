import { Link } from 'react-router-dom'

function Button({ as: Component, to, href, variant = 'primary', className = '', children, ...props }) {
  const classes = `button button--${variant} ${className}`.trim()

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    )
  }

  const Tag = Component || 'button'
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  )
}

export default Button
