import * as applicationAnswerSchema from "./application-answer-schema";
import * as assistantSkillSchema from "./assistant-skill-schema";
import * as authSchema from "./auth-schema";
import * as coverLetterSchema from "./cover-letter-schema";
import * as creditSchema from "./credits-schema";
import * as jobSchema from "./job-schema";
import * as resumeSchema from "./resume";
import * as savedProjectSchema from "./saved-project-schema";
import * as syncSchema from "./sync-schema";

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
