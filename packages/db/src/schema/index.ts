import * as applicationAnswerSchema from "./application-answer-schema.ts";
import * as assistantSkillSchema from "./assistant-skill-schema.ts";
import * as authSchema from "./auth-schema.ts";
import * as coverLetterSchema from "./cover-letter-schema.ts";
import * as creditSchema from "./credits-schema.ts";
import * as jobSchema from "./job-schema.ts";
import * as resumeSchema from "./resume/index.ts";
import * as savedProjectSchema from "./saved-project-schema.ts";
import * as syncSchema from "./sync-schema.ts";

export const schema = {
  ...applicationAnswerSchema,
  ...assistantSkillSchema,
  ...authSchema,
  ...coverLetterSchema,
  ...creditSchema,
  ...jobSchema,
  ...resumeSchema,
  ...savedProjectSchema,
  ...syncSchema,
};
