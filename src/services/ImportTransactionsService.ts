import fs from 'fs';

import csvParse from 'csv-parse';
import { getCustomRepository, getRepository, In } from 'typeorm';

import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';

interface TransactionCSV {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: 'string';
}

class ImportTransactionsService {
  async execute(csvFilePath: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionRepository);

    // generates a stream from the csv uploaded file path
    const transactionsReadStream = fs.createReadStream(csvFilePath);

    // configure the csv parse to start reading from second line,
    // ignoring the header
    const parsers = csvParse({
      from_line: 2,
    });

    // start parsing the CSV
    const parseCSV = transactionsReadStream.pipe(parsers);

    const transactions: TransactionCSV[] = [];
    const categories: string[] = [];

    // starts reading the CSV data
    parseCSV.on('data', async line => {
      // loop through each line of the CSV file
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      // check if the required columns values were filled
      if (!title || !type || !value) return;

      // check if the same category exists more than once in the CSV file
      if (!categories.includes(category)) {
        categories.push(category);
      }

      // add the CSV row information into an array of transactions
      transactions.push({ title, type, value, category });
    });

    // executed when finished reading
    await new Promise(resolve => parseCSV.on('end', resolve));

    // check if the categories exist in the database
    const existentCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    // generates an array conatining only the categories title
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    // generates a list of categories that
    // don't exist in the database, so we can insert them
    const addCategoryTitles = categories.filter(
      category => !existentCategoriesTitles.includes(category),
    );

    // create an array of categories to be inserted at once
    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    // save the array of categories into the database
    await categoriesRepository.save(newCategories);

    // build an array containing the inserted
    // categories and the existent categories
    const allCategories = [...newCategories, ...existentCategories];

    // insert all transactions and their respective categories
    const createdTransaction = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransaction);

    await fs.promises.unlink(csvFilePath);

    return createdTransaction;
  }
}

export default ImportTransactionsService;
