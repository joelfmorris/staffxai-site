import type { Metadata } from 'next';
import SmilePage from './SmilePage';

export const metadata: Metadata = {
  title: 'Dental Implant Consultation — Cranbourne Dental Studio',
  description: 'Book a free dental implant consultation with Cranbourne Dental Studio, serving Cranbourne, Clyde, Botanic Ridge and surrounds.',
  robots: { index: false, follow: false },
};

export default function SmilePageRoute() {
  return <SmilePage />;
}
