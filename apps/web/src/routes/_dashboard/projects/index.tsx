import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/projects/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_dashboard/projects/"!</div>
}
