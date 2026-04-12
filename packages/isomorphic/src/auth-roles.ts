import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  kitchen: ["list", "view", "create", "update", "delete", "set-availability"],
  cuisine: ["list", "view", "assign"],
  menu: ["list", "view", "create", "update", "delete"],
  order: ["list", "view", "create", "update", "cancel"],
  favorite: ["list", "create", "delete"],
  location: ["list", "create", "update", "delete"],
} as const;

const organizationAc = createAccessControl(statement);

const organizationRoles = {
  owner: organizationAc.newRole({
    ...ownerAc.statements,
    kitchen: ["list", "view", "create", "update", "delete", "set-availability"],
    cuisine: ["list", "view", "assign"],
    menu: ["list", "view", "create", "update", "delete"],
    order: ["list", "view", "create", "update", "cancel"],
    favorite: ["list", "create", "delete"],
    location: ["list", "create", "update", "delete"],
  }),
  manager: organizationAc.newRole({
    ...adminAc.statements,
    kitchen: ["list", "view"],
    cuisine: ["list", "view"],
    menu: ["list", "view"],
    order: ["list", "view", "create", "cancel"],
    favorite: ["list", "create", "delete"],
    location: ["list", "create", "update", "delete"],
  }),
  staff: organizationAc.newRole({
    ...memberAc.statements,
    kitchen: ["list", "view"],
    cuisine: ["list", "view"],
    menu: ["list", "view", "create", "update", "delete"],
    order: ["list", "view", "create", "update"],
    favorite: ["list", "create", "delete"],
    location: ["list", "create", "update", "delete"],
  }),

};

type BetterAuthUserRoles = "user"|"admin"
type BetterAuthOrgRole = "owner" | "staff" | "member" 
type BetterAuthOrgRoles = BetterAuthOrgRole| BetterAuthOrgRole[];

export { organizationAc, organizationRoles, type BetterAuthOrgRole, type BetterAuthOrgRoles, type BetterAuthUserRoles };
