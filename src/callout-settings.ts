import { App } from 'obsidian';
import { getCurrentThemeID } from 'obsidian-extra';

import { CalloutID } from '../api';

import { CalloutSettings, CalloutSettingsCondition, CalloutSettingsConditionType } from './settings';

/**
 * Gets the current environment that callouts are under.
 * This can be passed to {@link calloutSettingsToCSS}.
 *
 * @param app The app instance.
 * @returns The callout environment.
 */
export function currentCalloutEnvironment(app: App): Parameters<typeof checkCondition>[1] {
	const theme = getCurrentThemeID(app) ?? '<default>';
	return {
		theme,
		appearance: app.workspace.containerEl.doc.body.classList.contains('theme-dark') ? 'dark' : 'light',
	};
}

/**
 * Converts callout settings to CSS that applies the setting.
 *
 * @param id The callout ID.
 * @param settings The settings for the callout.
 * @param environment The environment to resolve conditions under.
 */
export function calloutSettingsToCSS(
	id: CalloutID,
	settings: CalloutSettings,
	environment: Parameters<typeof checkCondition>[1],
): string {
	const styles = calloutSettingsToStyles(settings, environment).join(';\t');
	if (styles.length === 0) {
		return '';
	}

	return `.callout[data-callout="${id}"] {\n\t` + styles + '\n}';
}

/**
 * Converts callout settings to a list of styles that apply the setting.
 *
 * @param condition The active conditions.
 */
export function calloutSettingsToStyles(
	settings: CalloutSettings,
	environment: Parameters<typeof checkCondition>[1],
): string[] {
	const styles: string[] = [];

	for (const setting of settings) {
		if (!checkCondition(setting.condition, environment)) {
			continue;
		}

		// Build the styles.
		const { changes } = setting;
		if (changes.color != null) styles.push(`--callout-color: ${changes.color}`);
		if (changes.icon != null) styles.push(`--callout-icon: ${changes.icon}`);
		if (changes.customStyles != null) styles.push(changes.customStyles);
	}

	return styles;
}

/**
 * Recursively checks a {@link CalloutSettingsCondition}.
 *
 * @param condition The condition to check.
 * @param environment The environment to check the condition against.
 *
 * @returns True if the condition holds for the given environment.
 */
function checkCondition(
	condition: CalloutSettingsCondition,
	environment: { theme: string; appearance: 'dark' | 'light' },
): boolean {
	if (condition == null) {
		return true;
	}

	// "or" combinator.
	if ('or' in condition && condition.or !== undefined) {
		return condition.or.findIndex((p) => checkCondition(p, environment) === true) !== undefined;
	}

	// "and" combinator.
	if ('and' in condition && condition.and !== undefined) {
		return condition.and.findIndex((p) => checkCondition(p, environment) === false) === undefined;
	}

	// Theme condition.
	if ('theme' in condition && condition.theme === environment.theme) {
		return true;
	}

	// Dark mode condition.
	if ('appearance' in condition && condition.appearance !== environment.appearance) {
		return true;
	}

	return false;
}

/**
 * Returns true if the condition is not an elementary condition.
 *
 * @param condition The condition to check.
 * @returns True if the condition is not elementary.
 */
export function isComplexCondition(condition: CalloutSettingsCondition): boolean {
	const type = typeofCondition(condition);
	return type === 'and' || type === 'or';
}

/**
 * Returns the type of condition of the provided condition.
 * @param condition The condition.
 * @returns The condition type.
 */
export function typeofCondition(condition: CalloutSettingsCondition): CalloutSettingsConditionType | undefined {
	if (condition === undefined) return undefined;
	const hasOwnProperty = Object.prototype.hasOwnProperty.bind(condition) as (
		type: CalloutSettingsConditionType,
	) => boolean;

	if (hasOwnProperty('appearance')) return 'appearance';
	if (hasOwnProperty('theme')) return 'theme';
	if (hasOwnProperty('and')) return 'and';
	if (hasOwnProperty('or')) return 'or';

	throw new Error(`Unsupported condition: ${JSON.stringify(condition)}`);
}
