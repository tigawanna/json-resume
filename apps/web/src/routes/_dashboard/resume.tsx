import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/resume')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_dashboard/resume"!</div>
}
