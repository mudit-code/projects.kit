/**
 * Application Logo & Icon Asset Routes
 *
 * Centralized registry of all logo routes served from /public/logos.
 * Updating here ensures consistent paths across all components and portals.
 */

export const LOGOS = {
  /** Main Kanpur Institute of Technology institutional logo */
  kit: "/logos/kit.png",
  /** Modern hourglass icon for urgent deadline countdowns */
  hourglass: "/logos/hourglass.png",
  /** Official WhatsApp logo for student and team contact fields */
  whatsapp: "/logos/whatsapp.png",
} as const;

export type LogoKey = keyof typeof LOGOS;
export default LOGOS;
