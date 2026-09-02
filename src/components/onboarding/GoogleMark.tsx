import Svg, { Path } from 'react-native-svg'

/*
 * Google's "G", drawn from the official four-colour mark.
 *
 * This is the real geometry, not an approximation. The first attempt built the
 * G out of a rotated ring with four coloured borders and a rectangle for the
 * crossbar, which reads as a Google logo at a glance and as obviously wrong the
 * moment you look at it — the arcs met at the wrong angles and the bar floated.
 * Since "Continue with Google" is a button people recognise by its mark, a
 * near-miss is worse than no mark at all.
 *
 * Four paths on an 18x18 viewBox, in Google's own brand colours. Scaled by the
 * `size` prop; the aspect ratio is fixed and square.
 */

const BLUE = '#4285F4'
const GREEN = '#34A853'
const YELLOW = '#FBBC05'
const RED = '#EA4335'

export function GoogleMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        fill={BLUE}
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
      />
      <Path
        fill={GREEN}
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <Path
        fill={YELLOW}
        d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <Path
        fill={RED}
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </Svg>
  )
}
