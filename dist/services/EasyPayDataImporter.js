import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../database/init.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class EasyPayDataImporter {
    jsonPath;
    stats;
    constructor(jsonPath) {
        this.jsonPath = jsonPath || path.join(__dirname, '../../../data/easypayClients.json');
        this.stats = {
            total: 0,
            imported: 0,
            skipped: 0,
            errors: 0,
            duplicates: 0,
            processingTime: 0
        };
    }
    /**
     * Import all EasyPay clients from JSON file
     */
    async importAll(options = {}) {
        const startTime = Date.now();
        try {
            console.log('🚀 Starting EasyPay data import...');
            if (!fs.existsSync(this.jsonPath)) {
                throw new Error(`JSON file not found: ${this.jsonPath}`);
            }
            const jsonData = JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
            const clients = jsonData.Sheet1 || [];
            this.stats.total = clients.length;
            console.log(`📊 Found ${this.stats.total} clients to import`);
            if (options.dryRun) {
                console.log('🔍 DRY RUN MODE - No data will be imported');
                return this.analyzeData(clients);
            }
            const batchSize = options.batchSize || 100;
            const batches = this.createBatches(clients, batchSize);
            console.log(`📦 Processing ${batches.length} batches of ${batchSize} clients each`);
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`⏳ Processing batch ${i + 1}/${batches.length} (${batch.length} clients)`);
                await this.processBatch(batch, options);
                // Progress update
                const progress = Math.round(((i + 1) / batches.length) * 100);
                console.log(`📈 Progress: ${progress}% (${this.stats.imported + this.stats.skipped}/${this.stats.total})`);
            }
            this.stats.processingTime = Date.now() - startTime;
            console.log('✅ Import completed!');
            console.log(`📊 Final Stats:`, this.stats);
            return this.stats;
        }
        catch (error) {
            console.error('❌ Import failed:', error);
            throw error;
        }
    }
    /**
     * Analyze data without importing (dry run)
     */
    async analyzeData(clients) {
        console.log('🔍 Analyzing data...');
        const clientIds = new Set();
        const emails = new Set();
        let duplicates = 0;
        for (const client of clients) {
            if (clientIds.has(client["Client ID"])) {
                duplicates++;
            }
            else {
                clientIds.add(client["Client ID"]);
            }
            if (client["Email"] && emails.has(client["Email"])) {
                duplicates++;
            }
            else if (client["Email"]) {
                emails.add(client["Email"]);
            }
        }
        this.stats.duplicates = duplicates;
        this.stats.skipped = duplicates;
        console.log(`📊 Analysis complete:`);
        console.log(`   Total clients: ${this.stats.total}`);
        console.log(`   Duplicate Client IDs: ${duplicates}`);
        console.log(`   Unique emails: ${emails.size}`);
        return this.stats;
    }
    /**
     * Create batches for processing
     */
    createBatches(clients, batchSize) {
        const batches = [];
        for (let i = 0; i < clients.length; i += batchSize) {
            batches.push(clients.slice(i, i + batchSize));
        }
        return batches;
    }
    /**
     * Process a batch of clients
     */
    async processBatch(batch, options) {
        const promises = batch.map(client => this.processClient(client, options));
        await Promise.allSettled(promises);
    }
    /**
     * Process a single client
     */
    async processClient(client, options) {
        try {
            const clientId = client["Client ID"];
            if (!clientId) {
                this.stats.errors++;
                return;
            }
            // Check if client already exists
            const existingClient = await this.checkExistingClient(clientId);
            if (existingClient) {
                if (options.skipDuplicates) {
                    this.stats.skipped++;
                    return;
                }
                if (options.updateExisting) {
                    await this.updateClient(client);
                    this.stats.imported++;
                }
                else {
                    this.stats.skipped++;
                }
            }
            else {
                await this.insertClient(client);
                this.stats.imported++;
            }
        }
        catch (error) {
            console.error(`❌ Error processing client ${client["Client ID"]}:`, error);
            this.stats.errors++;
        }
    }
    /**
     * Check if client already exists
     */
    async checkExistingClient(clientId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT id FROM easypay_clients WHERE client_id = ?', [clientId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
    /**
     * Insert new client
     */
    async insertClient(client) {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO easypay_clients (
          client_id, display_name, ssn, is_resident, password, pin,
          first_name, last_name, address, date_of_birth, is_enabled,
          email, phone, phone2, gender, language, phone_verified,
          email_verified, open_date, is_verified, ordered_registration,
          verification_date, registration_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                client["Client ID"], client["Display Name"], client["SSN"], client["Is Resident"],
                client["Password"], client["Pin"], client["First Name"], client["Last Name"],
                client["Address"], client["Date Of Birth"], client["Is Enabled"],
                client["Email"], client["Phone"], client["Phone2"], client["Gender"],
                client["Language"], client["Phone Verified"], client["Email Verified"],
                client["Open Date"], client["Is Varificated"], client["Ordered Registration"],
                client["VerificationDate"], client["Registration Type"]
            ], function (err) {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Update existing client
     */
    async updateClient(client) {
        return new Promise((resolve, reject) => {
            db.run(`UPDATE easypay_clients SET 
          display_name = ?, ssn = ?, is_resident = ?, password = ?, pin = ?,
          first_name = ?, last_name = ?, address = ?, date_of_birth = ?, is_enabled = ?,
          email = ?, phone = ?, phone2 = ?, gender = ?, language = ?, phone_verified = ?,
          email_verified = ?, open_date = ?, is_verified = ?, ordered_registration = ?,
          verification_date = ?, registration_type = ?, updated_at = CURRENT_TIMESTAMP
          WHERE client_id = ?`, [
                client["Display Name"], client["SSN"], client["Is Resident"],
                client["Password"], client["Pin"], client["First Name"], client["Last Name"],
                client["Address"], client["Date Of Birth"], client["Is Enabled"],
                client["Email"], client["Phone"], client["Phone2"], client["Gender"],
                client["Language"], client["Phone Verified"], client["Email Verified"],
                client["Open Date"], client["Is Varificated"], client["Ordered Registration"],
                client["VerificationDate"], client["Registration Type"], client["Client ID"]
            ], function (err) {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Get import statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            total: 0,
            imported: 0,
            skipped: 0,
            errors: 0,
            duplicates: 0,
            processingTime: 0
        };
    }
}
export default EasyPayDataImporter;
//# sourceMappingURL=EasyPayDataImporter.js.map