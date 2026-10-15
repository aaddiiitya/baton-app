// ---------------------------------------------------------------------------
// ColourPicker — round swatches for the four person colours (never grey).
// ---------------------------------------------------------------------------

import { COLOUR_DOT, type ResidentColour } from '../../types'

interface ColourPickerProps {
  id: string
  colours: ResidentColour[]
  value: ResidentColour
  onChange: (colour: ResidentColour) => void
}

export default function ColourPicker({ id, colours, value, onChange }: ColourPickerProps) {
  return (
    <div id={id} role="radiogroup" className="flex gap-3">
      {colours.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-label={c}
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={`h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-canvas ${
            value === c ? 'ring-ink' : 'ring-transparent'
          }`}
        >
          <span className={`block h-full w-full rounded-full ${COLOUR_DOT[c]}`} />
        </button>
      ))}
    </div>
  )
}
