import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/setiings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_dashboard/setiings"!</div>
}
