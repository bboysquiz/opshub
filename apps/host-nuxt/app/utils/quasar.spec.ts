import { QDialog } from 'quasar';
import { quasarComponents } from './quasarComponents';

describe('Quasar registration', () => {
  it('registers QDialog as a component instead of leaving it as an inline custom element', () => {
    expect(quasarComponents.QDialog).toBe(QDialog);
  });
});
