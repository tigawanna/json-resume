import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppConfig } from "@/utils/system";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Edit, Mail, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { IdePickerDialog } from "./IdePickerDialog";

const MCP_SCOPES = [
  { id: "resume:read", label: "Read your resume data", icon: BookOpen },
  { id: "resume:write", label: "Update your resume data", icon: Edit },
  { id: "openid", label: "Verify your identity", icon: ShieldCheck },
  { id: "profile", label: "Access your name and avatar", icon: User },
  { id: "email", label: "Access your email address", icon: Mail },
] as const;

export function McpConsentCard() {
  const [showIdePicker, setShowIdePicker] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Card className="border-primary/20 bg-base-100/90 w-full max-w-xl shadow-xl backdrop-blur">
        <CardHeader className="text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-14 items-center justify-center rounded-full">
            <ShieldCheck className="size-7" />
          </div>
          <CardTitle className="text-3xl">Connect your IDE</CardTitle>
          <CardDescription>
            Allow AI assistants in your editor to access your {AppConfig.name} data through MCP.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="bg-base-200/70 rounded-lg p-4" data-test="mcp-consent-scopes">
            <p className="text-sm font-medium">This connection will allow</p>
            <ul className="mt-3 space-y-2">
              {MCP_SCOPES.map(({ id, label, icon: Icon }) => (
                <li key={id} className="flex items-center gap-3">
                  <div className="bg-base-100 flex size-8 items-center justify-center rounded-full">
                    <Icon className="text-primary size-4" />
                  </div>
                  <span className="text-sm">{label}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground text-sm">
            Your IDE will handle authentication securely via OAuth. You can revoke access at any
            time from your settings.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/settings" })}
            data-test="mcp-consent-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => setShowIdePicker(true)}
            data-test="mcp-consent-agree"
          >
            Agree
          </Button>
        </CardFooter>
      </Card>

      <IdePickerDialog open={showIdePicker} onOpenChange={setShowIdePicker} />
    </>
  );
}
