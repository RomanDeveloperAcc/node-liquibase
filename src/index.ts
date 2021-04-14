#!/usr/bin/env node
import { spawn } from 'child_process';
import { join } from 'path';
import { LiquibaseCommands } from './enums/liquibase-commands.enum';
import {
	CalculateCheckSumCommandAttributes,
	FutureRollbackCountSQLCommandAttributes, GenerateChangeLogCommandAttributes,
	LiquibaseConfig,
	UpdateCommandAttributes
} from './models/index';


export class Liquibase {
	/**
	 * @description Returns an instance of a lightweight Liquibase Wrapper.
	 *
	 * @param params Configuration for an instance of `Liquibase`
	 *
	 * * @example
	 * ```javascript
	 * const liquibase = require('node-liquibase');
	 *
	 * const config = {
	 *   contexts: 'TEST,DEV',
	 *   labels: 'staging,Jira-1200',
	 *   logLevel: 'debug',
	 *   overwriteOutputFile: 'true',
	 *   logFile: 'myLog.log'
	 * };
	 *
	 * liquibase(config)
	 *   .run('status', '--verbose')
	 *   .then(() => console.log('success'))
	 *   .catch((err) => console.error('fail', err));
	 * ```
	 */
	constructor(
		private params: LiquibaseConfig,
	) {
		this.mergeParamsWithDefaults(params);
	}

	/**
	* The update command deploys any changes that are in the changelog file and that have not been deployed to your database yet.
	* @param params Arguments/Attributes for the command
	*
	* @description The update command is typically used to apply database changes that are specified in the changelog file to your database.
	* When you run the update command, Liquibase sequentially reads changesets in the changelog file, then it compares the unique identifiers of id, author, and path to filename to the values stored in the DATABASECHANGELOG table.
	* If the unique identifiers do not exist, Liquibase will apply the changeset to the database.
	* If the unique identifiers exist, the MD5Sum of the changeset is compared to the one in the database.
	* If they are different, Liquibase will produce an error message that someone has changed it unexpectedly. However, if the status of the runOnChange or runAlways changeset attribute is set to TRUE, Liquibase will re-apply the changeset.
	*/
	public update(params: UpdateCommandAttributes) {
		this.run(LiquibaseCommands.Update, params);
	}

	/**
	 * The calculateCheckSum <id> command calculates and prints a checksum for the changeset with the specified id in the following format: filepath::id::author.
	 *
	 * @param params - Arguments/Attribute for the command.
	 *
	 * @description The calculateCheckSum <id> command is typically used to compute an MD5 checksum, which serves as a unique identifier for the changeset. As a result, you can see whether the changeset has been changed and whether it has to be deployed differently now.
	 * When running the calculateCheckSum <id> command, the DATABASECHANGELOG table calculates an MD5 checksum for each entry based on the SQL script of the changeset. This checksum helps Liquibase detect differences between the changesets you want to deploy and the changesets that have already been run against the database.
	 * The MD5SUM column in the DATABASECHANGELOG table contains a checksum of the changeset and any change made in the changeset will result in a different checksum.
	 *
	 * {@link https://docs.liquibase.com/commands/community/calculatechecksum.html Documentation}
	 */
	public calculateCheckSum(params: CalculateCheckSumCommandAttributes) {
		this.run(LiquibaseCommands.CalculateCheckSum, params);
	}

	/**
	 * The futureRollbackCountSQL <value> command generates the SQL that Liquibase would use to sequentially revert the number of changes associated with undeployed changesets, which are added to a changelog file.
	 *
	 * @param params Arguments/Attributes for the command
	 *
	 * @description The futureRollbackCountSQL <value> command is typically used to inspect the SQL before rolling back the number of changesets that you have not deployed to your database but added to your changelog. The command shows the output starting with the most recent changes until the value specified is reached.
	 * It is best practice to inspect SQL, which Liquibase would run when using the rollback command so you can review any changes the command would make to your database.
	 */
	public futureRollbackCountSQL(params: FutureRollbackCountSQLCommandAttributes): void {
		this.run(LiquibaseCommands.FutureRollbackCountSql, params);
	}

	/**
	 * The generateChangeLog command creates a changelog file that has a sequence of changesets which describe how to re-create the current state of the database.
	 *
	 * @param params Arguments/Attributes for the command
	 *
	 * @description The generateChangeLog command is typically used when you want to capture the current state of a database, then apply those changes to any number of databases. This is typically only done when a project has an existing database, but hasn't used Liquibase before.
	 *
	 * {@link https://docs.liquibase.com/workflows/liquibase-community/existing-project.html Details}
	 */
	public generateChangeLog(params: GenerateChangeLogCommandAttributes): void {
		this.run(LiquibaseCommands.GenerateChangeLog, params);
	}

	private stringifyParams(params: { [key: string]: any }) {
		let commandString = '';

		for (const property in params) {
			const targetValue = params[property];
			commandString += `--${property}=${JSON.stringify(targetValue)} `
		}

		return commandString;
	}

	/**
	 * LEGACY CODE START
	 */
	/**
	 * Spawns a Liquibase command.
	 * @param {*} action a string for the Liquibase command to run. Defaults to `'update'`
	 * @param {*} params any parameters for the command
	 * @returns {Promise} Promise of a node child process.
	 */
	private run(action: LiquibaseCommands, params: { [key: string]: any }) {
		const paramString = this.stringifyParams(params);
		return this.spawnChildProcess(`${this.liquibasePathAndGlobalAttributes} ${action} ${paramString}`);
	}

	/**
	 * Internal Getter that returns a node child process compatible command string.
	 * @returns {string}
	 * @private
	 */
	private get liquibasePathAndGlobalAttributes() {
		let liquibasePathAndGlobalAttributes = `${this.params.liquibase}`;
		Object.keys(this.params).forEach(key => {
			if (key === 'liquibase') {
				return;
			}
			const value = (this.params as { [key: string]: any })[key];
			liquibasePathAndGlobalAttributes = `${liquibasePathAndGlobalAttributes} --${key}=${value}`;
		});
		return liquibasePathAndGlobalAttributes;
	}

	/**
	 *
	 * Internal method for executing a child process.
	 * @param {*} commandString Liquibase commandString
	 */
	private spawnChildProcess(commandString: string): Promise<number | null | Error> {
		console.log(`Running ${commandString}...`);

		return new Promise((resolve, reject) => {
			const spawnedChild = spawn(commandString);
			spawnedChild.on('error', (err) => {
				return reject(err);
			});

			spawnedChild.on('close', (code) => {
				console.log(`Exited with code ${code}`);
				return resolve(code);
			});

			spawnedChild.stdout.on('data', (standardOutput) => {
				console.log('\n', standardOutput);
			});

			spawnedChild.stderr.on('data', (standardError) => {
				console.error('\n', standardError);
			});
		});
	}

	private mergeParamsWithDefaults(params: LiquibaseConfig) {
		const defaultParams = {
			// MSSQL Default Parameters
			liquibase: join(__dirname, './liquibase/liquibase'),
			changeLogFile: join(__dirname, './change-log-examples/mssql/changelog.mssql.sql'),
			url: '"jdbc:sqlserver://<IP OR HOSTNAME>:<port number>;database=<database name>;"',
			username: '<username>',
			password: '<password>',
			// liquibaseProLicenseKey: '<paste liquibase-pro-license-key here>',
			classpath: join(__dirname, './drivers/mssql-jdbc-7.4.1.jre8.jar')
			// PostgreSQL Default Parameters Template
			// liquibase: 'liquibase/liquibase',
			// changeLogFile: 'change-log-examples/postgreSQL/changelog.postgresql.sql',
			// url: 'jdbc:postgresql://<IP OR HOSTNAME>:5432/MY_DATABASE_TEST',
			// username: 'postgres',
			// password: 'password',
			// //liquibaseProLicenseKey: '<paste liquibase-pro-license-key here>',
			// classpath: 'drivers/postgresql-42.2.8.jar'
		};

		this.params = Object.assign({}, defaultParams, params);
	}
	/**
	 * LEGACY CODE END
	**/
}
