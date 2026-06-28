import { useId } from 'react';
import type { CSSProperties } from 'react';

// A real React island. useId() gives each <SearchBox /> instance a unique id, so
// the label and input stay wired even when the component renders more than once.
// A fixed string here would point both labels at the first input. Inline styles
// because Astro's scoped CSS does not reach a framework island.
const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
  padding: 0,
  margin: -1,
};

function SearchBox() {
  const id = useId();
  return (
    <p style={{ margin: '0 0 0.4rem' }}>
      <label htmlFor={id} style={srOnly}>
        Search products
      </label>
      <input id={id} type="search" />
    </p>
  );
}

export default function SearchPairReact() {
  return (
    <div>
      <SearchBox />
      <SearchBox />
    </div>
  );
}
