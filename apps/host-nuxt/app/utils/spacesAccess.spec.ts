import {
  canPerformSpaceAccessOperation,
  spaceAccessConstraints,
  spaceAccessEmptyStateCopy,
  spaceAccessErrorStateCopy,
} from './spacesAccess';

describe('spaces access contract', () => {
  it('describes required domain constraints', () => {
    expect(spaceAccessConstraints.map((item) => item.id)).toEqual([
      'space_contains_projects_and_members',
      'project_members_must_be_space_members',
      'tickets_must_have_project',
    ]);
  });

  it('resolves role operations for workspace management', () => {
    expect(canPerformSpaceAccessOperation('admin', 'createSpace')).toBe(true);
    expect(canPerformSpaceAccessOperation('agent', 'manageProjectMembers')).toBe(true);
    expect(canPerformSpaceAccessOperation('employee', 'createProject')).toBe(false);
    expect(canPerformSpaceAccessOperation(null, 'viewMemberSpaces')).toBe(false);
  });

  it('keeps UI empty and error states explicit', () => {
    expect(spaceAccessEmptyStateCopy.noSpaces.title).toBe('Пространств пока нет');
    expect(spaceAccessEmptyStateCopy.noEligibleProjectMembers.message).toContain('пространство');
    expect(spaceAccessErrorStateCopy.projectMemberOutsideSpace.title).toBe(
      'Пользователь не входит в пространство',
    );
  });
});
