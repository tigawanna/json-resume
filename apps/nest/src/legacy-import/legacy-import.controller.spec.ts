import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { LegacyImportLibraryController } from './legacy-import-library.controller.js';
import { LegacyImportResumeController } from './legacy-import-resume.controller.js';

const controllers = [
  LegacyImportLibraryController,
  LegacyImportResumeController,
];

describe('legacy import HTTP surface', () => {
  it('exposes only authenticated read routes', () => {
    for (const controller of controllers) {
      expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe(
        'legacy-import',
      );
      const prototype: object = controller.prototype;
      for (const name of Object.getOwnPropertyNames(prototype)) {
        if (name === 'constructor') continue;
        const handler: unknown = Reflect.get(prototype, name);
        if (typeof handler !== 'function') continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler);
        if (method !== undefined) expect(method).toBe(RequestMethod.GET);
      }
    }
  });
});
