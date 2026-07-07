import type { Metadata } from 'next';
import SmilePage from './SmilePage';

export const metadata: Metadata = {
  title: 'Dental Implant Consultation — Collins Street Dental Studio',
  description: 'Book a free dental implant consultation with Collins Street Dental Studio in Melbourne CBD.',
  robots: { index: false, follow: false },
};

export default function SmilePageRoute() {
  return <SmilePage />;
}
