import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, businessName } = await req.json();

    // Validações
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, e-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    // Verificar se já existe
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado. Tente fazer login." },
        { status: 409 }
      );
    }

    // Gerar slug único a partir do nome do restaurante
    const baseSlug = (businessName || name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.user.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário com role FRANCHISEE (dono de restaurante)
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: "FRANCHISEE",
        storeName: businessName || name,
        storePhone: phone || null,
        slug,
        permissions: "",
        isFranqueadoHakim: false,
        storeOpen: true,
        cashOpen: false,
        autoAcceptOrders: false,
        storeAlertSound: "bell",
        storeOrderCount: 0,
        planPercent: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Conta criada com sucesso!",
      userId: user.id,
      slug: user.slug,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar conta. Tente novamente." },
      { status: 500 }
    );
  }
}
