import { redirect } from 'next/navigation';

export default function AdminPage() {
  // For now, redirect straight to the themes dashboard as it's our primary feature
  redirect('/goatech-admin-hq/themes');
}
