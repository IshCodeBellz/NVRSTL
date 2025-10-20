'use client'

import React from 'react'

type Variant = 'time' | 'datetime' | 'date'

export function LocalTime({
  value,
  variant = 'time',
  className,
  options,
}: {
  value: string | number | Date
  variant?: Variant
  className?: string
  options?: Intl.DateTimeFormatOptions
}) {
  const date = React.useMemo(() => new Date(value), [value])
  const fmtOptions: Intl.DateTimeFormatOptions = React.useMemo(() => {
    if (options) return options
    switch (variant) {
      case 'date':
        return { year: 'numeric', month: 'short', day: '2-digit' }
      case 'datetime':
        return {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }
      case 'time':
      default:
        return { hour: '2-digit', minute: '2-digit', second: '2-digit' }
    }
  }, [variant, options])

  const valueStr = React.useMemo(
    () => date.toLocaleString(undefined, fmtOptions),
    [date, fmtOptions]
  )

  return <time className={className} dateTime={date.toISOString()}>{valueStr}</time>
}
