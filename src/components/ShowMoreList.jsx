// Shows the first few rows, with a "See more" button.
import { useState } from 'react'

export default function ShowMoreList({ items, render, first = 3, step = 10, empty = null }) {
  const [count, setCount] = useState(first)
  if (!items.length) return empty
  const left = items.length - count

  return (
    <>
      {items.slice(0, count).map(render)}
      {(left > 0 || count > first) && (
        <div className="more-row">
          {left > 0 && (
            <button type="button" className="small more-btn" onClick={() => setCount(count + step)}>
              See more ({left})
            </button>
          )}
          {count > first && (
            <button type="button" className="small ghost" onClick={() => setCount(first)}>
              See less
            </button>
          )}
        </div>
      )}
    </>
  )
}
