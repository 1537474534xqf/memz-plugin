import xlsx from 'xlsx';
import path from 'node:path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Config } from '../components/index.js';
const { search_resource } = Config.getYaml('config', 'memz-config');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 设置 Excel 文件夹路径
const folderPath = path.join(__dirname, '..', 'data', 'xlsx');

// 从 Excel 文件夹中读取所有文件的数据
function loadDataFromExcelFiles() {
    const files = fs.readdirSync(folderPath);
    const data = [];

    files.forEach(file => {
        if (file.endsWith('.xlsx')) {
            const filePath = path.join(folderPath, file);
            const workbook = xlsx.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const sheetData = xlsx.utils.sheet_to_json(sheet, { header: ['ID', '关键词', '内容', '分类'], defval: '', range: 1 });
            data.push(...sheetData);  // 合并所有文件的数据
        }
    });

    return data;
}

// 在 Excel 数据中搜索资源
function searchResources(keyword, data) {
    const results = data.filter(row => row.关键词.includes(keyword));
    return results;
}

// 统计分类数量
function countCategories(data) {
    const categoryCount = {};

    data.forEach(row => {
        const category = row.分类 || '未分类';
        if (categoryCount[category]) {
            categoryCount[category]++;
        } else {
            categoryCount[category] = 1;
        }
    });

    return categoryCount;
}

export class ResourceSearchPlugin extends plugin {
    constructor() {
        super({
            name: '资源搜索',
            dsc: '根据关键词搜索名称',
            event: 'message',
            priority: 1,
            rule: [
                {
                    reg: '^#?搜资源\\s*(\\S+)$',
                    fnc: 'handleSearch'
                },
                {
                    reg: '^#?资源(分类|类别)?(统计|数量|总数|总计)$',
                    fnc: 'handleCategoryCount'
                }
            ]
        });

        // 加载所有 Excel 文件
        this.data = loadDataFromExcelFiles();
    }

    async handleSearch(e) {
        if (!search_resource) return logger.warn('[memz-plugin]搜资源状态当前为关闭');
        const match = e.msg.match(/^#?搜资源\s*(\S+)$/);
        const keyword = match ? match[1] : null;

        if (!keyword) {
            return await e.reply('请输入关键词进行搜索！', true);
        }
        try {
            const results = searchResources(keyword, this.data);
            if (results.length > 0) {
                const forward = results.map(row => ({
                    user_id: 382879217,
                    nickname: 'ZSY11',
                    message: [
                        `名称: ${row.关键词}\n内容: ${row.内容}\n分类: ${row.分类}`
                    ]
                }));
                forward.push({
                    user_id: 382879217,
                    nickname: 'ZSY11',
                    message: [
                        `来源：十一实验室(QQ群632226555)\n官网：https://zsy11.com`
                    ]
                });
                const nmsg = await Bot.makeForwardMsg(forward);
                await e.reply(nmsg);
            } else {
                await e.reply('未找到匹配的结果。', true);
            }
        } catch (error) {
            await e.reply(`搜索过程中发生错误：${error.message}`, true);
        }
    }

    // 统计分类数量
    async handleCategoryCount(e) {
        try {
            const categoryCount = countCategories(this.data);
            let message = '----资源分类统计----\n';

            for (const category in categoryCount) {
                message += `${category}: ${categoryCount[category]} 个资源\n`;
            }

            await e.reply(message);
        } catch (error) {
            await e.reply(`统计过程中发生错误：${error.message}`, true);
        }
    }
}
