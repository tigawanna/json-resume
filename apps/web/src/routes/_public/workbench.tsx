import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

export const Route = createFileRoute('/_public/workbench')({
  component: RouteComponent,


})

const TanstackDBWorkbench = lazy(() => import('./-components/TanstackDb'))
function RouteComponent() {
 return (
    <div>
      <TanstackDBWorkbench />
    </div>
  );
}
