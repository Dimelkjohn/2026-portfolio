/** One way to reach John: a typed tag, the channel in red and the address after it. */
export type ContactLink = {
  id: string
  /** The channel, in the tag's red eyebrow: 'Email', 'LinkedIn'. */
  channel: string
  /** What the tag says after the eyebrow. */
  label: string
  href: string
}

/** The ways in, in the order the tags are dealt out when the handshake is clicked. */
export const contactLinks: ContactLink[] = [
  {
    id: 'email',
    channel: 'Email',
    label: 'paul.johndim@gmail.com',
    // The native mail app opens with John named as the recipient, not just the address.
    href: 'mailto:' + encodeURIComponent('John Dimelu <paul.johndim@gmail.com>'),
  },
  {
    id: 'linkedin',
    channel: 'LinkedIn',
    label: 'john-dimelu',
    href: 'https://www.linkedin.com/in/john-dimelu/',
  },
  {
    id: 'github',
    channel: 'GitHub',
    label: 'Dimelkjohn',
    href: 'https://github.com/Dimelkjohn',
  },
]
