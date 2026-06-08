import { AdminHeader } from "@/components/layout/AdminHeader";
import {
  PlaceholderPage,
  type PlaceholderPageProps,
} from "@/components/pages/PlaceholderPage";

type AdminPlaceholderPageProps = Omit<PlaceholderPageProps, "embedded">;

export function AdminPlaceholderPage(props: AdminPlaceholderPageProps) {
  return (
    <>
      <AdminHeader title={props.title} description={props.description} />
      <PlaceholderPage {...props} embedded />
    </>
  );
}
